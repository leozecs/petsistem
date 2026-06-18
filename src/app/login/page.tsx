import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] bg-zinc-100 text-zinc-950 lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mb-8 rounded-md border-zinc-300 bg-white",
            )}
          >
              <ArrowLeft className="size-4" />
              Voltar
          </Link>
          <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <LockKeyhole className="size-5" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Entrar no PETSISTEM</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                A autenticação final usa Supabase Auth. Esta tela já está pronta para conectar email e senha.
              </p>
              <form className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="voce@petshop.com.br" className="rounded-md" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" placeholder="Sua senha" className="rounded-md" />
                </div>
                <Button className="h-11 w-full rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="hidden overflow-hidden bg-zinc-950 lg:block">
        <div
          className="h-full min-h-[100dvh] opacity-70"
          style={{
            backgroundImage: "url(https://picsum.photos/seed/petsistem-login/1400/1600)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "grayscale(1) contrast(1.2)",
          }}
        />
      </section>
    </main>
  );
}
