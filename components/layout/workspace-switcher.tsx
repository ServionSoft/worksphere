"use client";

import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { workspace, workspaces, setWorkspaceId } = useWorkspaceStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-auto w-full justify-between border-border bg-background px-2.5 py-2 hover:bg-muted",
              collapsed && "justify-center px-0"
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: workspace.color }}
          />
          {!collapsed ? (
            <span className="min-w-0 text-left">
              <span className="block truncate text-xs font-medium text-foreground">
                {workspace.name}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {workspace.plan}
              </span>
            </span>
          ) : null}
        </span>
        {!collapsed ? (
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => setWorkspaceId(item.id)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </span>
              {item.id === workspace.id ? (
                <Check className="size-3.5 text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Create workspace</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
