export function normalizeUgandaPhone(input: string): string {
  const value = input.trim()

  if (!value) {
    throw new Error('Phone number is required.')
  }

  const digits = value.replace(/\D/g, '')

  let nationalNumber: string

  if (digits.startsWith('256')) {
    nationalNumber = digits.slice(3)
  } else if (digits.startsWith('0')) {
    nationalNumber = digits.slice(1)
  } else {
    nationalNumber = digits
  }

  if (!/^7\d{8}$/.test(nationalNumber)) {
    throw new Error(
      'Enter a valid Uganda mobile number, for example 0771895506.',
    )
  }

  return `256${nationalNumber}`
}

export function formatUgandaPhone(phone: string): string {
  const canonical = normalizeUgandaPhone(phone)
  return `0${canonical.slice(3)}`
}
