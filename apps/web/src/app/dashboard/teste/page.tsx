"use server";

import { auth } from "@/src/domains/auth/auth";
import Teste from "./Form";

export default async function Teste2() {
  const session = await auth();

  return <Teste />;
}
