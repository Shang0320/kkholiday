export const GITHUB_TOKEN_STORAGE_KEY = 'kkholiday_github_actions_token_v1';

export const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=KKHoliday%20mobile%20control&description=Control%20the%20kkholiday%20GitHub%20Actions&target_name=Shang0320&expires_in=90&actions=write';

export async function dispatchGitHubWorkflow(
  workflowFile: string,
  inputs: Record<string, string>,
  token: string,
) {
  const response = await fetch(
    `https://api.github.com/repos/Shang0320/kkholiday/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main', inputs }),
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload?.message === 'string' ? payload.message : `GitHub HTTP ${response.status}`;
    throw new Error(detail);
  }
}
