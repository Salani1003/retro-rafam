import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useNavigate} from "react-router-dom";
import {
  Smile,
  Meh,
  Wrench,
  Rocket,
  Share2,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card} from "@/components/ui/card";
import {
  createRetrospectiveSchema,
  joinRetrospectiveSchema,
  roomCodeSchema,
} from "@/schemas";
import type {CreateRetrospectiveInput, JoinRetrospectiveInput} from "@/schemas";
import {
  createRetrospective,
  joinRetrospective,
} from "@/services/retrospectives";
import {saveDisplayName, getSavedDisplayName} from "@/lib/local-participant";
import {toUserMessage} from "@/lib/errors";
import {toast} from "sonner";
import {useAuth} from "@/hooks/use-auth";
import {RetrospectiveList} from "@/components/retrospective/retrospective-list";

const STEPS = [
  {
    icon: Sparkles,
    title: "Creá tu sala",
    text: "Ponele nombre a la retro de tu equipo. No hace falta registrarse.",
  },
  {
    icon: Share2,
    title: "Compartí el código",
    text: "Mandale el enlace o el código de 6 caracteres a tu equipo.",
  },
  {
    icon: MessagesSquare,
    title: "Reflexionen juntos",
    text: "Sumen tarjetas, voten y cierren la retro cuando terminen.",
  },
];

const COLUMN_PREVIEW = [
  {
    icon: Smile,
    label: "Cosas buenas",
    color: "var(--column-good)",
    bg: "var(--column-good-bg)",
  },
  {
    icon: Meh,
    label: "Más o menos",
    color: "var(--column-okay)",
    bg: "var(--column-okay-bg)",
  },
  {
    icon: Wrench,
    label: "A corregir",
    color: "var(--column-fix)",
    bg: "var(--column-fix-bg)",
  },
  {
    icon: Rocket,
    label: "Acciones",
    color: "var(--column-action)",
    bg: "var(--column-action-bg)",
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const {userId, isReady, error: authError} = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createForm = useForm<CreateRetrospectiveInput>({
    resolver: zodResolver(createRetrospectiveSchema),
    defaultValues: {
      displayName: getSavedDisplayName(),
      title: "",
      teamName: "",
    },
  });

  const joinForm = useForm<JoinRetrospectiveInput & {roomCode: string}>({
    resolver: zodResolver(
      joinRetrospectiveSchema.extend({roomCode: roomCodeSchema}),
    ),
    defaultValues: {displayName: getSavedDisplayName(), roomCode: ""},
  });

  async function onCreate(values: CreateRetrospectiveInput) {
    if (!isReady || !userId) {
      toast.error(
        "Todavía estamos preparando tu sesión. Esperá un instante e intentá de nuevo.",
      );
      return;
    }
    setIsCreating(true);
    try {
      const retro = await createRetrospective(values);
      saveDisplayName(values.displayName);
      toast.success("Retro creada. ¡Compartí el código con tu equipo!");
      navigate(`/retro/${retro.roomCode}`);
    } catch (err) {
      toast.error(
        toUserMessage(
          err,
          "No pudimos crear la retro. Intentá de nuevo.",
        ),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function onJoin(values: JoinRetrospectiveInput & {roomCode: string}) {
    if (!isReady || !userId) {
      toast.error(
        "Todavía estamos preparando tu sesión. Esperá un instante e intentá de nuevo.",
      );
      return;
    }
    setIsJoining(true);
    try {
      const retro = await joinRetrospective(values);
      saveDisplayName(values.displayName);
      navigate(`/retro/${retro.roomCode}`);
    } catch (err) {
      toast.error(
        toUserMessage(err, "No pudimos encontrar esa sala. Revisá el código."),
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-6 py-14 sm:py-20">
        <header className="flex flex-col gap-6">
          <img src="/logo-rafam.png" alt="RAFAM 2" className="h-10 w-auto self-start" />

          <div className="max-w-2xl">
            <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Retro de equipo
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Creá un tablero, compartí un código de sala y reflexionen juntos
              sobre el sprint. Sin registro, sin contraseñas: entrás con tu
              nombre y listo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Crear una Retro</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Vas a ser quien administra la sala y puede finalizarla.
              </p>
            </div>

            <form
              onSubmit={createForm.handleSubmit(onCreate)}
              className="flex flex-col gap-4"
            >
              <Field
                label="Tu nombre"
                error={createForm.formState.errors.displayName?.message}
                inputProps={{
                  placeholder: "Ej: Matias",
                  ...createForm.register("displayName"),
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre de la retro (opcional)"
                  error={createForm.formState.errors.title?.message}
                  inputProps={{
                    placeholder: "Sprint 24",
                    ...createForm.register("title"),
                  }}
                />
                <Field
                  label="Equipo (opcional)"
                  error={createForm.formState.errors.teamName?.message}
                  inputProps={{
                    placeholder: "Plataforma",
                    ...createForm.register("teamName"),
                  }}
                />
              </div>
              <Button type="submit" disabled={isCreating} className="mt-1">
                {isCreating ? "Creando sala…" : "Crear Retro"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 border-t border-border pt-5">
              {COLUMN_PREVIEW.map(({icon: Icon, label, color, bg}) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{background: bg, color}}
                >
                  <Icon className="size-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Unirte con un código</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pedile el código de 6 caracteres a quien creó la retro, o abrí
                el enlace que te compartieron.
              </p>
            </div>

            <form
              onSubmit={joinForm.handleSubmit(onJoin)}
              className="flex flex-col gap-4"
            >
              <Field
                label="Tu nombre"
                error={joinForm.formState.errors.displayName?.message}
                inputProps={{
                  placeholder: "Ej: Lucía",
                  ...joinForm.register("displayName"),
                }}
              />
              <Field
                label="Código de la sala"
                error={joinForm.formState.errors.roomCode?.message}
                inputProps={{
                  placeholder: "ABC123",
                  className:
                    "font-[var(--font-mono)] uppercase tracking-widest",
                  ...joinForm.register("roomCode"),
                }}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={isJoining}
                className="mt-1"
              >
                {isJoining ? "Uniéndote…" : "Unirme a la sala"}
              </Button>
            </form>
          </Card>
        </div>

        <RetrospectiveList enabled={isReady && !authError} />

        {authError && (
          <p className="text-center text-sm text-destructive">
            No pudimos conectar con Supabase: {authError}. Revisá la
            configuración en .env.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  inputProps,
}: {
  label: string;
  error?: string;
  inputProps: React.ComponentProps<typeof Input>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input {...inputProps} aria-invalid={Boolean(error)} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
