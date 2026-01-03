# GitHub Sponsors Authentication

This document explains how the GitHub Sponsors authentication feature works in Demo Time.

## Overview

Demo Time now supports GitHub OAuth authentication to verify sponsor status and unlock Pro features for sponsors who contribute €10 or more per month.

## How It Works

### Extension Side

1. **Authentication Flow**
   - Users run the command `Demo Time: Authenticate with GitHub (Unlock Pro Features)`
   - VS Code's authentication provider prompts for GitHub OAuth
   - Required scopes: `read:user` and `read:org`
   - Access token is stored securely by VS Code

2. **Sponsor Verification**
   - On extension activation, the sponsor status is checked silently
   - If authenticated, the extension calls the sponsor verification API
   - The API response determines if Pro features are unlocked
   - Status is stored in workspace state and exposed via context key

3. **State Management**
   - `StateKeys.sponsor`: Stores boolean sponsor status in workspace state
   - `ContextKeys.isSponsor`: VS Code context key for conditional UI/features

### API Endpoint

The sponsor verification API is hosted at `https://demotime.show/api/sponsor`

**Request:**
```json
POST /api/sponsor
Content-Type: application/json

{
  "token": "<github-access-token>"
}
```

**Response:**
```json
{
  "isSponsor": true
}
```

**Logic:**
1. Accepts GitHub access token
2. Queries GitHub GraphQL API for:
   - Authenticated user's login (viewer.login)
   - Active sponsorships for @eliostruyf
3. Checks if user is sponsor with ≥€10/month tier
4. Returns boolean result

## Implementation Details

### Files Modified

- `apps/vscode-extension/src/services/SponsorService.ts` - Main service
- `apps/vscode-extension/src/constants/General.ts` - API URL and tier config
- `apps/vscode-extension/src/constants/StateKeys.ts` - State key
- `apps/vscode-extension/src/constants/ContextKeys.ts` - Context key
- `apps/vscode-extension/package.json` - Authentication command
- `docs/src/pages/api/sponsor.ts` - API endpoint

### Security Considerations

1. **No Secrets in Extension**: GitHub access token is never stored permanently
2. **API-Based Verification**: Sponsor check happens server-side
3. **Minimal Scopes**: Only necessary GitHub permissions requested
4. **Error Handling**: Graceful fallback if API is unavailable
5. **Type Safety**: Proper TypeScript interfaces for all API responses

### Testing

Run tests with:
```bash
npm run test
```

Test coverage includes:
- Constant values verification
- Type checking for all interfaces

## Future Enhancements

- Cache sponsor status for a period (e.g., 24 hours)
- Add UI indicator showing sponsor status
- Implement Pro features gated by `ContextKeys.isSponsor`
- Add telemetry for authentication success/failure rates
- Support for organization sponsors

## Troubleshooting

**Authentication fails:**
- Check internet connection
- Verify GitHub is accessible
- Try signing out and back in to GitHub in VS Code

**Sponsor status not recognized:**
- Ensure sponsorship is active on GitHub
- Verify tier is ≥€10/month
- Re-run authentication command
- Check extension logs for errors

**API errors:**
- The API endpoint must be deployed to production
- Check browser console for CORS or network issues
- Verify demotime.show is accessible
