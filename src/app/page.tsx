import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/locale";

// The middleware answers `/` first, reading the cookie this page cannot see
// (REQ-140). What is left is the render the middleware did not front, and
// it can only send the reader to the default.
// @req REQ-140
export default function Home() {
  redirect(`/${DEFAULT_LOCALE}`);
}
