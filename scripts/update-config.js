import fs from 'node:fs/promises';
import path from 'node:path';

const configPath = path.join(process.cwd(), 'config.json');
const requestedValue = process.env.QUIET_HOURS_ENABLED;

if (!['true', 'false'].includes(requestedValue)) {
  throw new Error('QUIET_HOURS_ENABLED must be true or false');
}

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
config.quietHours = {
  enabled: requestedValue === 'true',
  startHour: Number(config.quietHours?.startHour ?? 23),
  endHour: Number(config.quietHours?.endHour ?? 8),
};

await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Quiet hours ${config.quietHours.enabled ? 'enabled' : 'disabled'}`);
