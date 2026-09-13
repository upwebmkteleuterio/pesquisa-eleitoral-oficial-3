import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const functionName = 'manage-client'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) throw new Error('Não autorizado')
    const token = authorization.slice('Bearer '.length)
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token)
    if (userError || !user) throw new Error('Não autorizado')

    const { data: adminProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError || adminProfile?.role !== 'admin') throw new Error('Apenas administradores podem gerenciar clientes')

    const payload = await req.json()
    const action = payload.action
    console.log(`[${functionName}] Ação solicitada: ${action}`)

    if (action === 'create') {
      if (!payload.email || !payload.password || !payload.nome || !payload.cpf) throw new Error('Dados obrigatórios ausentes')
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { nome: payload.nome, role: 'cliente' },
      })
      if (createError || !created.user) throw createError || new Error('Não foi possível criar o usuário')
      const { error: insertError } = await serviceClient.from('profiles').upsert({
        id: created.user.id,
        nome: payload.nome,
        email: payload.email,
        cpf: payload.cpf,
        role: 'cliente',
      })
      if (insertError) {
        await serviceClient.auth.admin.deleteUser(created.user.id)
        throw insertError
      }
      console.log(`[${functionName}] Cliente criado: ${created.user.id}`)
      return json({ success: true, id: created.user.id }, 200)
    }

    if (action === 'update') {
      if (!payload.id || !payload.nome || !payload.cpf) throw new Error('Dados obrigatórios ausentes')
      const { data: target, error: targetError } = await serviceClient.from('profiles').select('id').eq('id', payload.id).eq('role', 'cliente').single()
      if (targetError || !target) throw new Error('Cliente não encontrado')
      const authUpdate: { password?: string } = {}
      if (payload.password) authUpdate.password = payload.password
      if (Object.keys(authUpdate).length > 0) {
        const { error } = await serviceClient.auth.admin.updateUserById(payload.id, authUpdate)
        if (error) throw error
      }
      const { error } = await serviceClient.from('profiles').update({ nome: payload.nome, cpf: payload.cpf }).eq('id', payload.id).eq('role', 'cliente')
      if (error) throw error
      console.log(`[${functionName}] Cliente atualizado: ${payload.id}`)
      return json({ success: true, id: payload.id }, 200)
    }

    if (action === 'delete') {
      if (!payload.id) throw new Error('Cliente não informado')
      const { data: target, error: targetError } = await serviceClient.from('profiles').select('id').eq('id', payload.id).eq('role', 'cliente').single()
      if (targetError || !target) throw new Error('Cliente não encontrado')
      const { error } = await serviceClient.auth.admin.deleteUser(payload.id)
      if (error) throw error
      console.log(`[${functionName}] Cliente excluído: ${payload.id}`)
      return json({ success: true }, 200)
    }

    throw new Error('Ação inválida')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    console.error(`[${functionName}] Erro: ${message}`)
    return json({ error: message }, 400)
  }
})
