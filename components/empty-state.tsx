import { Card } from "@heroui/react";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="w-full">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{detail}</Card.Description>
      </Card.Header>
    </Card>
  );
}
