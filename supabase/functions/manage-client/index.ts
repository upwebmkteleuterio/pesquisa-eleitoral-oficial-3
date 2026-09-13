import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

type Payload = Record<string, unknown>

class RequestError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const functionName = 'manage-client'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const requiredText = (payload: Payload, key: string) => {
  const value = payload[key]
  if (typeof value !== 'string' || !value.trim()) throw new RequestError(400, `Campo obrigatório: ${key}`)
  return value.trim()
}

const getPesquisaIds = (payload: Payload) => {
  if (!Array.isArray(payload.pesquisa_ids) || payload.pesquisa_ids.some(id => typeof id !== 'string')) {
    throw new RequestError(400, 'pesquisa_ids deve ser uma lista de identificadores válidos')
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const ids = [...new Set(payload.pesquisa_ids.map(id => (id as string).trim()))]
  if (ids.some(id => !uuidPattern.test(id))) throw new RequestError(400, 'Um ou mais formulários são inválidos')
  return ids
}

async function validatePesquisas(serviceClient: ReturnType<typeof createClient>, ids: string[]) {
  if (!ids.length) return
  const { data, error } = await serviceClient.from('pesquisas').select('id').in('id', ids)
  if (error) throw new RequestError(500, 'Não foi possível validar os formulários selecionados')
  if (!data || data.length !== ids.length) throw new RequestError(400, 'Um ou mais formulários selecionados não existem')
}

async function replaceClientLinks(serviceClient: ReturnType<typeof createClient>, clientId: string, pesquisaIds: string[]) {
  const { error: deleteError } = await serviceClient.from('pesquisa_clientes').delete().eq('cliente_id', clientId)
  if (deleteError) throw new RequestError(500, 'Não foi possível atualizar os formulários vinculados')
  if (!pesquisaIds.length) return

  const { error: insertError } = await serviceClient.from('pesquisa_clientes').insert(
    pesquisaIds.map(pesquisa_id => ({ pesquisa_id, cliente_id: clientId })),
  )
  if (insertError) throw new RequestError(500, 'Não foi possível salvar os formulários vinculados')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const authorization = req.headers.get('Authorization') || ''
    const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i)
    if (!tokenMatch) throw new RequestError(401, 'Token de acesso ausente ou inválido')

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(tokenMatch[1])
    if (userError || !user) throw new RequestError(401, 'Sessão inválida ou expirada')

    const { data: adminProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError || adminProfile?.role !== 'admin') throw new RequestError(403, 'Apenas administradores podem gerenciar clientes')

    let payload: Payload
    try {
      payload = await req.json() as Payload
    } catch {
      throw new RequestError(400, 'Corpo da requisição inválido')
    }
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new RequestError(400, 'Corpo da requisição inválido')
    const action = payload.action

    if (action === 'create') {
      const nome = requiredText(payload, 'nome')
      const email = requiredText(payload, 'email')
      const password = requiredText(payload, 'password')
      const pesquisaIds = getPesquisaIds(payload)
      await validatePesquisas(serviceClient, pesquisaIds)

      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, role: 'cliente' },
      })
      if (createError || !created.user) throw new RequestError(400, 'Não foi possível criar o acesso do cliente')

      try {
        const profileData: Record<string, unknown> = { id: created.user.id, nome, email, role: 'cliente', nome_empresa: typeof payload.nome_empresa === 'string' ? payload.nome_empresa.trim() || null : null }
        if (typeof payload.cpf === 'string' && payload.cpf.trim()) profileData.cpf = payload.cpf.trim()
        const { error: insertError } = await serviceClient.from('profiles').upsert(profileData)
        if (insertError) throw new RequestError(500, 'Não foi possível criar o perfil do cliente')
        await replaceClientLinks(serviceClient, created.user.id, pesquisaIds)
      } catch (error) {
        await serviceClient.auth.admin.deleteUser(created.user.id)
        throw error
      }

      console.log(`[${functionName}] Cliente criado: ${created.user.id}`)
      return json({ success: true, id: created.user.id }, 200)
    }

    if (action === 'update') {
      const id = requiredText(payload, 'id')
      const nome = requiredText(payload, 'nome')
      const email = requiredText(payload, 'email')
      const pesquisaIds = getPesquisaIds(payload)
      await validatePesquisas(serviceClient, pesquisaIds)

      const { data: target, error: targetError } = await serviceClient
        .from('profiles')
        .select('id, cpf')
        .eq('id', id)
        .eq('role', 'cliente')
        .single()
      if (targetError || !target) throw new RequestError(404, 'Cliente não encontrado')

      const authUpdate: Record<string, string | boolean> = { email, email_confirm: true }
      if (typeof payload.password === 'string' && payload.password) authUpdate.password = payload.password
      const { error: authError } = await serviceClient.auth.admin.updateUserById(id, authUpdate)
      if (authError) throw new RequestError(400, 'Não foi possível atualizar o acesso do cliente')

      const profileData: Record<string, unknown> = { nome, email, nome_empresa: typeof payload.nome_empresa === 'string' ? payload.nome_empresa.trim() || null : null }
      if (typeof payload.cpf === 'string' && payload.cpf.trim()) profileData.cpf = payload.cpf.trim()
      const { error: updateError } = await serviceClient.from('profiles').update(profileData).eq('id', id).eq('role', 'cliente')
      if (updateError) throw new RequestError(500, 'Não foi possível atualizar o perfil do cliente')

      const { data: previousLinks, error: previousLinksError } = await serviceClient.from('pesquisa_clientes').select('pesquisa_id').eq('cliente_id', id)
      if (previousLinksError) throw new RequestError(500, 'Não foi possível carregar os formulários vinculados')
      try {
        await replaceClientLinks(serviceClient, id, pesquisaIds)
      } catch (error) {
        if (previousLinks?.length) await serviceClient.from('pesquisa_clientes').insert(previousLinks.map(link => ({ pesquisa_id: link.pesquisa_id, cliente_id: id })))
        throw error
      }

      console.log(`[${functionName}] Cliente atualizado: ${id}`)
      return json({ success: true, id }, 200)
    }

    if (action === 'delete') {
      const id = requiredText(payload, 'id')
      const { data: target, error: targetError } = await serviceClient.from('profiles').select('id').eq('id', id).eq('role', 'cliente').single()
      if (targetError || !target) throw new RequestError(404, 'Cliente não encontrado')
      const { error } = await serviceClient.auth.admin.deleteUser(id)
      if (error) throw new RequestError(500, 'Não foi possível excluir o cliente')
      console.log(`[${functionName}] Cliente excluído: ${id}`)
      return json({ success: true }, 200)
    }

    throw new RequestError(400, 'Ação inválida')
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500
    const message = error instanceof RequestError ? error.message : 'Erro inesperado ao gerenciar cliente'
    if (!(error instanceof RequestError)) console.error(`[${functionName}] Falha interna`)
    return json({ error: message }, status)
  }
})
