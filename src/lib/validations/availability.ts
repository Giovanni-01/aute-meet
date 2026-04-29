export interface AvailabilityRule {
  day_of_week: number // 0 = Monday … 6 = Sunday
  start_time: string // "HH:MM" (24h)
  end_time: string // "HH:MM" (24h)
}

export interface AvailabilityError {
  index?: number
  message: string
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateAvailabilityRules(
  rules: AvailabilityRule[]
): AvailabilityError[] {
  const errors: AvailabilityError[] = []

  if (!Array.isArray(rules)) {
    errors.push({ message: "Se esperaba un array de reglas." })
    return errors
  }

  if (rules.length > 28) {
    errors.push({ message: "No puedes tener más de 28 franjas horarias (4 por día)." })
    return errors
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]

    if (
      rule.day_of_week === undefined ||
      rule.day_of_week < 0 ||
      rule.day_of_week > 6
    ) {
      errors.push({ index: i, message: `Franja ${i + 1}: día inválido (0-6).` })
      continue
    }

    if (!TIME_REGEX.test(rule.start_time)) {
      errors.push({
        index: i,
        message: `Franja ${i + 1}: hora de inicio inválida (formato HH:MM).`,
      })
      continue
    }

    if (!TIME_REGEX.test(rule.end_time)) {
      errors.push({
        index: i,
        message: `Franja ${i + 1}: hora de fin inválida (formato HH:MM).`,
      })
      continue
    }

    if (rule.start_time >= rule.end_time) {
      errors.push({
        index: i,
        message: `Franja ${i + 1}: la hora de inicio debe ser anterior a la de fin.`,
      })
    }
  }

  // Check for overlaps within the same day
  const byDay = new Map<number, { start: string; end: string; index: number }[]>()
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    const dayRules = byDay.get(rule.day_of_week) ?? []
    dayRules.push({ start: rule.start_time, end: rule.end_time, index: i })
    byDay.set(rule.day_of_week, dayRules)
  }

  for (const [, dayRules] of byDay) {
    const sorted = [...dayRules].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        errors.push({
          index: sorted[i].index,
          message: `Franja ${sorted[i].index + 1}: se solapa con otra franja del mismo día.`,
        })
      }
    }
  }

  return errors
}
