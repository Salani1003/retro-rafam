import { z } from 'zod'

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Ingresá al menos 2 caracteres')
  .max(40, 'Máximo 40 caracteres')

export const createRetrospectiveSchema = z.object({
  displayName: displayNameSchema,
  title: z.string().trim().max(80, 'Máximo 80 caracteres').optional(),
  teamName: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
})

export type CreateRetrospectiveInput = z.infer<typeof createRetrospectiveSchema>

export const joinRetrospectiveSchema = z.object({
  displayName: displayNameSchema,
})

export type JoinRetrospectiveInput = z.infer<typeof joinRetrospectiveSchema>

export const roomCodeSchema = z
  .string()
  .trim()
  .min(4, 'El código debe tener al menos 4 caracteres')
  .max(10, 'Código inválido')
  .transform((value) => value.toUpperCase())

export const commentContentSchema = z
  .string()
  .trim()
  .min(1, 'El comentario no puede estar vacío')
  .max(500, 'Máximo 500 caracteres')

export const commentFormSchema = z.object({
  content: commentContentSchema,
  assignee: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
})

export type CommentFormInput = z.infer<typeof commentFormSchema>
