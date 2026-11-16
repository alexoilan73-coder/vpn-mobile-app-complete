import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/studio/desk";

export const Route = createFileRoute("/channel/$channelId")({
  component: function ChannelPage() {
    const { channelId } = Route.useParams();
    return <Desk channelId={channelId} />;
  },
});
