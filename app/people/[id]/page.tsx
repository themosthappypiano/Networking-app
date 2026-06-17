"use client";

import { useParams } from "next/navigation";
import { PersonProfile } from "@/components/person-profile";

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  return <PersonProfile personId={params.id} />;
}
