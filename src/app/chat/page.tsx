import { FullChatApp } from "@/components/chat-interface"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Chat - Lupa",
  description: "Ask questions about your uploaded documents",
}

export default function ChatPage() {
  return <FullChatApp />
}
