export interface EventTypeInput {
  title: string
  slug: string
  description?: string | null
  duration_minutes: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  color?: string
  is_active?: boolean
}

export interface EventTypeError {
  field: string
  message: string
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const ALLOWED_DURATIONS = [15, 30, 45, 60, 90, 120]

export function validateEventType(
  input: Partial<EventTypeInput>,
  partial = false
): EventTypeError[] {
  const errors: EventTypeError[] = []

  if (!partial || input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      errors.push({ field: "title", message: "El título es obligatorio." })
    } else if (input.title.trim().length > 100) {
      errors.push({
        field: "title",
        message: "El título no puede superar los 100 caracteres.",
      })
    }
  }

  if (!partial || input.slug !== undefined) {
    if (!input.slug || input.slug.trim().length === 0) {
      errors.push({ field: "slug", message: "El slug es obligatorio." })
    } else if (!SLUG_REGEX.test(input.slug)) {
      errors.push({
        field: "slug",
        message:
          "El slug solo puede contener letras minúsculas, números y guiones.",
      })
    } else if (input.slug.length > 80) {
      errors.push({
        field: "slug",
        message: "El slug no puede superar los 80 caracteres.",
      })
    }
  }

  if (!partial || input.duration_minutes !== undefined) {
    if (
      input.duration_minutes === undefined ||
      input.duration_minutes === null
    ) {
      errors.push({
        field: "duration_minutes",
        message: "La duración es obligatoria.",
      })
    } else if (!ALLOWED_DURATIONS.includes(input.duration_minutes)) {
      errors.push({
        field: "duration_minutes",
        message: `La duración debe ser una de: ${ALLOWED_DURATIONS.join(", ")} minutos.`,
      })
    }
  }

  if (input.buffer_before_minutes !== undefined) {
    if (input.buffer_before_minutes < 0 || input.buffer_before_minutes > 60) {
      errors.push({
        field: "buffer_before_minutes",
        message: "El buffer antes debe ser entre 0 y 60 minutos.",
      })
    }
  }

  if (input.buffer_after_minutes !== undefined) {
    if (input.buffer_after_minutes < 0 || input.buffer_after_minutes > 60) {
      errors.push({
        field: "buffer_after_minutes",
        message: "El buffer después debe ser entre 0 y 60 minutos.",
      })
    }
  }

  if (input.color !== undefined && input.color !== null) {
    if (!HEX_COLOR_REGEX.test(input.color)) {
      errors.push({
        field: "color",
        message: "El color debe ser un código hexadecimal válido (#RRGGBB).",
      })
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (input.description.length > 500) {
      errors.push({
        field: "description",
        message: "La descripción no puede superar los 500 caracteres.",
      })
    }
  }

  return errors
}

/**
 * Auto-generates a URL-safe slug from a title string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}
