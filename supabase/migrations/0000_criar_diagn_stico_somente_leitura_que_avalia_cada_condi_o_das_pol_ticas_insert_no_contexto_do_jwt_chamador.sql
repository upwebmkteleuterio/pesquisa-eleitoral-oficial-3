CREATE OR REPLACE FUNCTION public.diagnose_public_submission_rls(p_pesquisa_id uuid, p_pesquisador_id uuid, p_origem text, p_audio_storage_path text, p_audio_mime_type text, p_audio_duration_seconds integer, p_audio_consent_at timestamp with time zone, p_audio_consent_state text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
WITH checks AS (
  SELECT
    auth.role() AS jwt_role,
    COALESCE(public.is_public_survey_for_submission(p_pesquisa_id), false) AS survey_is_public,
    COALESCE(p_origem = 'web', false) AS origin_is_web,
    p_pesquisador_id IS NULL AS researcher_is_null,
    p_audio_storage_path IS NULL AS audio_storage_path_is_null,
    p_audio_mime_type IS NULL AS audio_mime_type_is_null,
    p_audio_duration_seconds IS NULL AS audio_duration_is_null,
    p_audio_consent_at IS NULL AS audio_consent_at_is_null,
    p_audio_consent_state IS NULL AS audio_consent_state_is_null,
    COALESCE(
      auth.role() = 'authenticated'
      AND (
        p_pesquisador_id = auth.uid()
        OR (((auth.jwt() -> 'app_metadata' -> 'role' ->> 'role') = 'admin'))
      ),
      false
    ) AS authenticated_insert_policy_passes
), result AS (
  SELECT *,
    survey_is_public
      AND origin_is_web
      AND researcher_is_null
      AND audio_storage_path_is_null
      AND audio_mime_type_is_null
      AND audio_duration_is_null
      AND audio_consent_at_is_null
      AND audio_consent_state_is_null AS public_insert_policy_passes
  FROM checks
)
SELECT jsonb_build_object(
  'jwt_role', jwt_role,
  'survey_is_public', survey_is_public,
  'origin_is_web', origin_is_web,
  'researcher_is_null', researcher_is_null,
  'audio_storage_path_is_null', audio_storage_path_is_null,
  'audio_mime_type_is_null', audio_mime_type_is_null,
  'audio_duration_is_null', audio_duration_is_null,
  'audio_consent_at_is_null', audio_consent_at_is_null,
  'audio_consent_state_is_null', audio_consent_state_is_null,
  'public_insert_policy_passes', public_insert_policy_passes,
  'authenticated_insert_policy_passes', authenticated_insert_policy_passes,
  'insert_policy_would_allow',
    CASE jwt_role
      WHEN 'anon' THEN public_insert_policy_passes
      WHEN 'authenticated' THEN public_insert_policy_passes OR authenticated_insert_policy_passes
      ELSE false
    END
)
FROM result;
$function$