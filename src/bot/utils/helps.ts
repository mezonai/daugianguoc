export function extractMessage(message: string) {
  const args = message.replace('\n', ' ').slice('*'.length).trim().split(/ +/);
  if (args.length > 0) {
    return [args.shift()?.toLowerCase(), args];
  } else return [false, []];
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomColor(): string {
  const colors: string[] = [
    '#1ABC9C', // Aqua
    '#11806A', // DarkAqua
    '#57F287', // Green
    '#1F8B4C', // DarkGreen
    '#3498DB', // Blue
    '#206694', // DarkBlue
    '#9B59B6', // Purple
    '#71368A', // DarkPurple
    '#E91E63', // LuminousVividPink
    '#AD1457', // DarkVividPink
    '#F1C40F', // Gold
    '#C27C0E', // DarkGold
    '#E67E22', // Orange
    '#A84300', // DarkOrange
    '#ED4245', // Red
    '#992D22', // DarkRed
    '#BCC0C0', // LightGrey
    '#FFFF00', // Yellow
  ];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex] || '#F1C40F';
}

export function toVietnamTime(date: Date): Date {
  const vietnamTimeString = date.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  return new Date(vietnamTimeString);
}

export function getCurrentVietnamTime(): Date {
  const now = new Date();
  const vietnamTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  return new Date(vietnamTimeString);
}

export function toVietnamTimeString(date: Date): string {
  const vietnamTime = toVietnamTime(date);
  return vietnamTime.toISOString().slice(0, 16);
}
