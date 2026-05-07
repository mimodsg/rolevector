import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 text-[#172033]">
      <form className="w-full max-w-md rounded-md border border-[#d9deea] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
          Email
          <input
            className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]"
            type="email"
          />
        </label>
        <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
          Password
          <input
            className="rounded-md border border-[#c7cfdd] px-3 py-2 font-normal outline-none focus:border-[#1f6f5b]"
            type="password"
          />
        </label>
        <button
          className="mt-5 w-full rounded-md bg-[#1f6f5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185847]"
          type="button"
        >
          Sign in
        </button>
        <p className="mt-4 text-sm text-[#4d5b6f]">
          Need an account?{" "}
          <Link className="font-semibold text-[#1f6f5b]" href="/register">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
