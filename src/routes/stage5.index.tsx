import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/stage5/")({
  component: () => <Navigate to="/stage5/reflection" />,
});