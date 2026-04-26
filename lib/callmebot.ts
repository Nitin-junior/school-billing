export async function sendWhatsAppOTP(
  phone: string,
  apiKey: string,
  otp: string,
  schoolName: string = "ShulkaPro School"
): Promise<boolean> {
  const message = encodeURIComponent(
    `🏫 ${schoolName}\n\n` +
    `Your login OTP is:\n\n` +
    `*${otp}*\n\n` +
    `Valid for 5 minutes only.\n` +
    `Do not share this with anyone.`
  );
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${message}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  apiKey: string,
  message: string
): Promise<boolean> {
  const encoded = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

// Payment confirmation message
export function paymentConfirmMessage(
  studentName: string,
  amount: number,
  receipt: string,
  dateBS: string
): string {
  return (
    `✅ *Payment Received*\n\n` +
    `Student: ${studentName}\n` +
    `Amount: ₨ ${amount.toLocaleString()}\n` +
    `Receipt No: ${receipt}\n` +
    `Date: ${dateBS}\n\n` +
    `Thank you! — ShulkaPro`
  );
}

// Due reminder message
export function dueReminderMessage(
  studentName: string,
  amount: number,
  monthBS: string,
  dueDateBS: string
): string {
  return (
    `⚠️ *Fee Due Reminder*\n\n` +
    `Student: ${studentName}\n` +
    `Month: ${monthBS}\n` +
    `Amount Due: ₨ ${amount.toLocaleString()}\n` +
    `Due Date: ${dueDateBS}\n\n` +
    `Please pay on time to avoid late fine.\n` +
    `— ShulkaPro`
  );
}
