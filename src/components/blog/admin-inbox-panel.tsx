import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { getContactMessages, setContactMessageRead } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function AdminInboxPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const loaded = useQuery({
    queryKey: ["contact-messages", page],
    queryFn: () => getContactMessages({ data: { page } }),
  });

  const mark = useMutation({
    mutationFn: (v: { id: string; is_read: boolean }) => setContactMessageRead({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact-messages"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not update the message."),
  });

  if (loaded.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading messages…</p>;

  const messages = loaded.data?.messages ?? [];
  const total = loaded.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-3">
      {!messages.length ? (
        <p className="text-sm text-muted-foreground">No messages yet. They arrive from the public contact page.</p>
      ) : null}

      {messages.map((m: any) => (
        <Card key={m.id}>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={m.is_read ? "secondary" : "default"}>{m.is_read ? "Read" : "New"}</Badge>
              <span className="font-semibold">{m.name}</span>
              <a href={`mailto:${m.email}`} className="text-sm text-primary underline">{m.email}</a>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {m.subject ? <p className="mt-1.5 text-sm font-medium">{m.subject}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.message}</p>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: m.id, is_read: !m.is_read })}>
                Mark as {m.is_read ? "unread" : "read"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" /> Messages are stored until you delete them; visitors are not asked to create an account.
      </p>
    </div>
  );
}
