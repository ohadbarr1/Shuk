/**
 * supabase-client.js — Supabase client initialization
 * Loaded after Supabase CDN script, before auth.js
 */
const SupabaseClient = (() => {
    // Replace these with your actual Supabase project values
    const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
    const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

    let client = null;

    function init() {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.warn('Supabase SDK not loaded — running in offline mode');
            return null;
        }
        client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return client;
    }

    function getClient() {
        if (!client) init();
        return client;
    }

    function isConfigured() {
        return SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' && SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
    }

    return { init, getClient, isConfigured };
})();
