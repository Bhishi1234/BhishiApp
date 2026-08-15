export function whatsappShareUrl(message: string, phone?: string | null) {
  const text = encodeURIComponent(message);
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length >= 10) {
    const withCountry = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${withCountry}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function reminderMessage(input: {
  memberName: string;
  groupName: string;
  amount: string;
  dueDate: string;
  upiId?: string | null;
}) {
  const upiLine = input.upiId
    ? ` Pay via UPI to ${input.upiId}. After you send, open Bhishi and tap I paid.`
    : " After you send, open Bhishi and tap I paid.";
  return `Namaste ${input.memberName}, ${input.amount} for ${input.groupName} is due on ${input.dueDate}.${upiLine} This app does not collect money.`;
}

export function inviteMessage(input: {
  groupName: string;
  amount: string;
  typeLabel: string;
  link: string;
}) {
  return `You are invited to join ${input.groupName} (${input.typeLabel}, ${input.amount} per cycle) on Bhishi.\n\nThis is a record-keeping group — money stays between members.\n\nJoin here: ${input.link}`;
}
