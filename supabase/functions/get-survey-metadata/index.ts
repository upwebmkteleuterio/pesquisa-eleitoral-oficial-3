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

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const surveyId = pathParts[pathParts.length - 1];

  if (!surveyId || surveyId === 'metadata') {
    return new Response('Survey ID missing', { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`[get-survey-metadata] Fetching metadata for survey: ${surveyId}`);

  const { data: survey, error } = await supabase
    .from('pesquisas')
    .select('nome, permitir_link_publico')
    .eq('id', surveyId)
    .single();

  if (error || !survey) {
    return new Response('Survey not found', { status: 404, headers: corsHeaders });
  }

  const title = survey.nome;
  const description = `Participe da pesquisa: ${survey.nome}. Sua opinião é fundamental!`;
  const imageUrl = "https://uxkjdiowdtoucvufsntd.supabase.co/storage/v1/object/public/assets/icon_veraxus.png"; // Placeholder or actual logo URL
  const appUrl = `https://uxkjdiowdtoucvufsntd.supabase.co/functions/v1/get-survey-metadata/${surveyId}`; // Redirect URL could be the app

  // Basic HTML response for SEO crawlers
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <meta name="description" content="${description}">
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="website">
      <meta property="og:url" content="${url.href}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${imageUrl}">

      <!-- Twitter -->
      <meta property="twitter:card" content="summary_large_image">
      <meta property="twitter:url" content="${url.href}">
      <meta property="twitter:title" content="${title}">
      <meta property="twitter:description" content="${description}">
      <meta property="twitter:image" content="${imageUrl}">

      <!-- Redirect to actual app -->
      <script>
        window.location.href = "https://veraxus.vercel.app/p/${surveyId}${url.search}";
      </script>
    </head>
    <body>
      <p>Redirecionando para a pesquisa...</p>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' },
  });
})
