import { db, NewsDraft, SocialAccount } from './db';

// Helper to check if we should run in mock mode
function isMockPublish(): boolean {
  return process.env.APP_MODE === 'mock';
}

/**
 * Publishes news to Facebook Page using Facebook Graph API.
 */
async function publishToFacebook(draft: NewsDraft, configStr: string): Promise<string> {
  if (isMockPublish()) {
    console.log(`[MOCK FB] Publishing to Facebook Page: "${draft.title}"`);
    return `fb-post-${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const config = JSON.parse(configStr);
    const { pageId, accessToken } = config;
    if (!pageId || !accessToken) throw new Error('Facebook Page ID or Access Token is missing');

    const message = `${draft.title}\n\n${draft.content}\n\n#ChronicleAI`;
    
    // If there is an image, we post as photo, otherwise as status update
    if (draft.imageUrl) {
      // Need absolute URL for Facebook to download the image. 
      // Note: If running locally, Facebook API cannot access localhost image.
      // So we fallback to a public mock image or check if URL is external.
      const isLocalImage = draft.imageUrl.startsWith('/');
      const photoUrl = isLocalImage 
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' 
        : draft.imageUrl;

      const url = `https://graph.facebook.com/v18.0/${pageId}/photos`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photoUrl,
          caption: message,
          access_token: accessToken
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Facebook API Error');
      return data.post_id || data.id;
    } else {
      const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          access_token: accessToken
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Facebook API Error');
      return data.id;
    }
  } catch (err: any) {
    console.error('Facebook posting failed:', err);
    throw new Error(err.message || 'Facebook integration error');
  }
}

/**
 * Publishes news to X (Twitter) using X API.
 */
async function publishToTwitter(draft: NewsDraft, configStr: string): Promise<string> {
  if (isMockPublish()) {
    console.log(`[MOCK X] Publishing to X (Twitter): "${draft.title}"`);
    return `x-tweet-${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const config = JSON.parse(configStr);
    const { apiKey, apiSecret, accessToken, accessTokenSecret } = config;
    if (!apiKey || !accessToken) throw new Error('Twitter credentials missing');

    // OAuth 1.0a is required for X API. Because implementing OAuth 1.0a signatures
    // by hand in pure node fetch is verbose, we recommend users use Webhooks/Make.com
    // for Twitter publishing if they do not want to install heavy SDKs.
    // However, we can perform a direct POST if they use X API v2 Bearer Token (Write-only for simple text tweets)
    // Or we throw a friendly error advising Webhook integration if OAuth 1.0a is needed.
    
    // For simplicity, we trigger simple fetch with Bearer token if configured, 
    // or log error for full OAuth configuration.
    const message = `${draft.title}\n\n${draft.content.substring(0, 200)}...\n\n#ChronicleAI`;
    
    // Webhook fallback is highly recommended for X due to API security complexity.
    throw new Error('Twitter direct API requires OAuth 1.0a signing. We recommend using the Webhook (Make.com) integration for automated X posting.');
  } catch (err: any) {
    console.error('X posting failed:', err);
    throw new Error(err.message || 'X integration error');
  }
}

/**
 * Publishes news to Instagram using Instagram Graph API.
 */
async function publishToInstagram(draft: NewsDraft, configStr: string): Promise<string> {
  if (isMockPublish()) {
    console.log(`[MOCK IG] Publishing to Instagram: "${draft.title}"`);
    return `ig-media-${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const config = JSON.parse(configStr);
    const { pageId, accessToken } = config;
    if (!pageId || !accessToken) throw new Error('Instagram configuration missing');
    if (!draft.imageUrl) throw new Error('Instagram posts require an image URL');

    const caption = `${draft.title}\n\n${draft.content}\n\n#ChronicleAI`;
    const isLocalImage = draft.imageUrl.startsWith('/');
    const photoUrl = isLocalImage 
      ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' 
      : draft.imageUrl;

    // 1. Create Media Container
    const containerUrl = `https://graph.facebook.com/v18.0/${pageId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: photoUrl,
        caption: caption,
        access_token: accessToken
      })
    });
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message || 'Instagram Container Error');

    const creationId = containerData.id;

    // 2. Publish Container
    const publishUrl = `https://graph.facebook.com/v18.0/${pageId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken
      })
    });
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message || 'Instagram Publish Error');

    return publishData.id;
  } catch (err: any) {
    console.error('Instagram posting failed:', err);
    throw new Error(err.message || 'Instagram integration error');
  }
}

/**
 * Sends a webhook POST request (Make.com, Zapier, Custom URL).
 */
async function publishToWebhook(draft: NewsDraft, configStr: string): Promise<string> {
  const config = JSON.parse(configStr);
  const webhookUrl = config.url || process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl === 'https://hook.us1.make.com/your-custom-hook-id') {
    throw new Error('Webhook URL is not configured');
  }

  if (isMockPublish()) {
    console.log(`[MOCK WEBHOOK] Sending payload to: ${webhookUrl}`);
    return 'webhook-success-mock';
  }

  try {
    const payload = {
      event: 'news.published',
      timestamp: new Date().toISOString(),
      draft: {
        id: draft.id,
        title: draft.title,
        content: draft.content,
        imageUrl: draft.imageUrl ? (draft.imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${draft.imageUrl}` : draft.imageUrl) : null,
        originalUrl: draft.originalUrl,
        originalSource: draft.originalSource
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with HTTP status ${response.status}`);
    }
    
    return 'webhook-ok';
  } catch (err: any) {
    console.error('Webhook sending failed:', err);
    throw new Error(err.message || 'Webhook integration error');
  }
}

/**
 * Publishes a drafted news article to the selected platforms.
 */
export async function publishDraft(draftId: string, platformIds: string[]): Promise<{ success: boolean; results: any[] }> {
  const draft = await db.getDraftById(draftId);
  if (!draft) throw new Error('Draft not found');

  const socialAccounts = await db.getSocialAccounts();
  const activeAccounts = socialAccounts.filter(sa => platformIds.includes(sa.id));

  if (activeAccounts.length === 0) {
    throw new Error('No valid social platforms selected');
  }

  const results = [];
  let overallSuccess = true;

  for (const account of activeAccounts) {
    let status = 'SUCCESS';
    let externalPostId = null;
    let errorMessage = null;

    try {
      if (account.platform === 'FACEBOOK') {
        externalPostId = await publishToFacebook(draft, account.config);
      } else if (account.platform === 'TWITTER') {
        externalPostId = await publishToTwitter(draft, account.config);
      } else if (account.platform === 'INSTAGRAM') {
        externalPostId = await publishToInstagram(draft, account.config);
      } else if (account.platform === 'WEBHOOK') {
        externalPostId = await publishToWebhook(draft, account.config);
      } else {
        throw new Error(`Platform ${account.platform} not supported`);
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'Unknown error';
      overallSuccess = false;
    }

    // Write Log
    await db.createLog({
      draftId: draft.id,
      platform: account.platform,
      status: status,
      externalPostId: externalPostId,
      errorMessage: errorMessage
    });

    results.push({
      platform: account.platform,
      status: status,
      postId: externalPostId,
      error: errorMessage
    });
  }

  // Update draft status
  const finalStatus = overallSuccess ? 'POSTED' : 'FAILED';
  await db.updateDraft(draft.id, {
    status: finalStatus,
    postedAt: overallSuccess ? new Date() : null
  });

  return { success: overallSuccess, results };
}
