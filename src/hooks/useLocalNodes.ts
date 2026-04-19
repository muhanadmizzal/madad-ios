import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface LocalNode {
  id: string;
  company_id: string;
  node_name: string;
  node_status: "provisioned" | "active" | "suspended" | "revoked";
  activation_status: "pending" | "activated" | "expired";
  last_sync_at: string | null;
  last_seen_at: string | null;
  sync_health: "unknown" | "healthy" | "degraded" | "stale" | "error";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalAccessRequest {
  id: string;
  company_id: string;
  requested_by: string;
  request_status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export function useLocalNodes(scope: "tenant" | "all" = "tenant") {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["madad-local-nodes", scope, companyId],
    queryFn: async () => {
      let q = supabase.from("madad_local_nodes").select("*").order("created_at", { ascending: false });
      if (scope === "tenant" && companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LocalNode[];
    },
    enabled: scope === "all" || !!companyId,
    staleTime: 30_000,
  });
}

export function useLocalAccessRequests(scope: "tenant" | "all" = "tenant") {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["madad-local-access-requests", scope, companyId],
    queryFn: async () => {
      let q = supabase.from("madad_local_access_requests").select("*").order("created_at", { ascending: false });
      if (scope === "tenant" && companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LocalAccessRequest[];
    },
    enabled: scope === "all" || !!companyId,
    staleTime: 30_000,
  });
}

export function useNodeEntitlements(nodeId: string | null) {
  return useQuery({
    queryKey: ["madad-node-entitlements", nodeId],
    queryFn: async () => {
      if (!nodeId) return { modules: [], features: [] };
      const [{ data: modules }, { data: features }] = await Promise.all([
        supabase.from("madad_local_node_modules").select("*").eq("local_node_id", nodeId),
        supabase.from("madad_local_node_features").select("*").eq("local_node_id", nodeId),
      ]);
      return { modules: modules || [], features: features || [] };
    },
    enabled: !!nodeId,
  });
}

export function useNodeSyncLogs(nodeId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["madad-node-sync-logs", nodeId, limit],
    queryFn: async () => {
      if (!nodeId) return [];
      const { data, error } = await supabase
        .from("madad_local_sync_logs")
        .select("*")
        .eq("local_node_id", nodeId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!nodeId,
  });
}

export function useRequestLocalAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notes: string | null) => {
      const { data, error } = await supabase.rpc("request_local_access", { p_notes: notes });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["madad-local-access-requests"] });
    },
  });
}

export function useCancelLocalAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("cancel_local_access_request", { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["madad-local-access-requests"] }),
  });
}

export function useProvisionLocalNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { requestId: string; nodeName: string; reviewNotes?: string }) => {
      const { data, error } = await supabase.rpc("provision_local_node", {
        p_request_id: args.requestId,
        p_node_name: args.nodeName,
        p_review_notes: args.reviewNotes ?? null,
      });
      if (error) throw error;
      return data as { node_id: string; provisioning_token: string; expires_at: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["madad-local-access-requests"] });
      qc.invalidateQueries({ queryKey: ["madad-local-nodes"] });
    },
  });
}

export function useRejectLocalAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { requestId: string; reviewNotes?: string }) => {
      const { error } = await supabase.rpc("reject_local_access_request", {
        p_request_id: args.requestId,
        p_review_notes: args.reviewNotes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["madad-local-access-requests"] }),
  });
}

export function useRefreshNodeEntitlements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nodeId: string) => {
      const { data, error } = await supabase.rpc("refresh_local_node_entitlements", { p_node_id: nodeId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["madad-node-entitlements"] });
      qc.invalidateQueries({ queryKey: ["madad-local-nodes"] });
    },
  });
}

export function useSetLocalNodeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { nodeId: string; status: "provisioned" | "active" | "suspended" | "revoked" }) => {
      const { error } = await supabase.rpc("set_local_node_status", {
        p_node_id: args.nodeId,
        p_status: args.status,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["madad-local-nodes"] }),
  });
}
