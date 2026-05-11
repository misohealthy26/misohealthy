"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  user: { id: string; email: string | null } | null;
};

export default function NavAuth({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className="nav-signin">
        sign in
      </Link>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="nav-user" ref={menuRef}>
      <button
        type="button"
        className="nav-avatar"
        onClick={() => setOpen((o) => !o)}
        aria-label="account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="nav-menu">
          <div className="nav-menu-email">{user.email}</div>
          <Link
            href="/saved"
            className="nav-menu-item"
            onClick={() => setOpen(false)}
          >
            saved recipes
          </Link>
          <button type="button" className="nav-menu-item" onClick={signOut}>
            sign out
          </button>
        </div>
      )}
    </div>
  );
}
