import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usamos a chave mestra para criar usuários
      { auth: { persistSession: false } }
    )

    // Verificação manual de Admin via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user || user.app_metadata.role?.role !== 'admin') {
      throw new Error('Apenas administradores podem criar pesquisadores')
    }

    const { id, email, password, nome, cpf } = await req.json()

    if (id) {
      const { data: target, error: targetError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', id)
        .eq('role', 'pesquisador')
        .single()

      if (targetError || !target) throw new Error('Colaborador não encontrado')

      console.log("[create-researcher] Atualizando usuário:", id)

      if (typeof password === 'string' && password.trim()) {
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(id, { password })
        if (updateError) throw updateError
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({ id, nome, email, cpf })

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log("[create-researcher] Iniciando criação de usuário:", email)

    // 1. Criar usuário no Auth
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role: 'pesquisador' }
    })

    if (createError) throw createError

    // 2. Criar perfil na tabela profiles (O trigger cuidará do resto)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        nome,
        email,
        cpf,
        role: 'pesquisador'
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("[create-researcher] Erro:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})