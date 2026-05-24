import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the n8n webhook url
    const { data: settingData, error: settingError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'n8n_webhook_campaign')
      .single();

    if (settingError || !settingData?.value) {
      console.error('Error fetching campaign webhook URL:', settingError);
      return NextResponse.json({ 
        error: 'n8n_webhook_campaign URL not found in system settings' 
      }, { status: 404 });
    }

    const webhookUrl = settingData.value;
    console.log(`Triggering campaign launch webhook: ${webhookUrl} for campaign ID: ${campaign_id}`);

    // Trigger the n8n webhook from the server side (avoiding browser CORS)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id,
        dry_run: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`n8n webhook returned status ${response.status}:`, errorText);
      return NextResponse.json({ 
        error: `n8n webhook returned status ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to launch campaign:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
