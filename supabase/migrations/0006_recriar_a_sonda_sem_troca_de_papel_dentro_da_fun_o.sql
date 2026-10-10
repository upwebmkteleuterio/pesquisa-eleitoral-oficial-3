CREATE OR REPLACE FUNCTION public.__probe_public_insert(p_mode text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_state text;
  v_msg text;
  v_dummy int;
BEGIN
  IF p_mode = 'conflict' THEN
    INSERT INTO public.submissoes (id, pesquisa_id, pesquisador_id, origem, nome_entrevistado, respostas_dinamicas)
    VALUES (gen_random_uuid(), '646efe8d-aae7-4c04-a0e9-e14917415eaa'::uuid, NULL, 'web', 'probe', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING RETURNING 1 INTO v_dummy;
  ELSIF p_mode = 'bad_origin' THEN
    INSERT INTO public.submissoes (id, pesquisa_id, pesquisador_id, origem, nome_entrevistado, respostas_dinamicas)
    VALUES (gen_random_uuid(), '646efe8d-aae7-4c04-a0e9-e14917415eaa'::uuid, NULL, 'app', 'probe', '{}'::jsonb)
    RETURNING 1 INTO v_dummy;
  ELSIF p_mode = 'bad_researcher' THEN
    INSERT INTO public.submissoes (id, pesquisa_id, pesquisador_id, origem, nome_entrevistado, respostas_dinamicas)
    VALUES (gen_random_uuid(), '646efe8d-aae7-4c04-a0e9-e14917415eaa'::uuid, 'fab7eea1-ea3d-46d8-8464-00aeb4288b1e'::uuid, 'web', 'probe', '{}'::jsonb)
    RETURNING 1 INTO v_dummy;
  ELSE
    INSERT INTO public.submissoes (id, pesquisa_id, pesquisador_id, origem, nome_entrevistado, respostas_dinamicas)
    VALUES (gen_random_uuid(), '646efe8d-aae7-4c04-a0e9-e14917415eaa'::uuid, NULL, 'web', 'probe', '{}'::jsonb)
    RETURNING 1 INTO v_dummy;
  END IF;
  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROBE_INSERT_SUCCEEDED';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  RETURN p_mode || ' -> ' || v_state || ' :: ' || v_msg;
END;
$fn$;