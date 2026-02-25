// supabase/functions/check-subscription/index.ts
// Returns user's current subscription status
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ plan: 'free', status: 'active' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ plan: 'free', status: 'active' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan, status, current_period_end')
            .eq('user_id', user.id)
            .single();

        const result = sub
            ? { plan: sub.plan, status: sub.status, periodEnd: sub.current_period_end }
            : { plan: 'free', status: 'active' };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('check-subscription error:', err);
        return new Response(JSON.stringify({ plan: 'free', status: 'active' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
