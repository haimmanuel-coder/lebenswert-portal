import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, UserCog, Plus, Trash2 } from "lucide-react";

const ROLLE_FARBEN: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  teamleitung: "bg-blue-100 text-blue-800",
  buchhaltung: "bg-yellow-100 text-yellow-800",
  mitarbeiter: "bg-green-100 text-green-800",
};

const BESCHAEFTIGUNG_LABEL: Record<string, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

export default function RbacVerwaltung() {
  const [selectedMaId, setSelectedMaId] = useState<number | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>("");

  const { data: alleMa, isLoading: loadingMa } = trpc.admin.mitarbeiterList.useQuery();
  const { data: roles, isLoading: loadingRoles } = trpc.rbac.listRoles.useQuery();
  const { data: empRoles, refetch: refetchEmpRoles } = trpc.rbac.getEmployeeRoles.useQuery(
    { employeeId: selectedMaId! },
    { enabled: !!selectedMaId }
  );
  const { data: empPerms } = trpc.rbac.getEmployeePermissions.useQuery(
    { employeeId: selectedMaId! },
    { enabled: !!selectedMaId }
  );

  const assignRole = trpc.rbac.assignRole.useMutation({
    onSuccess: () => { toast.success("Rolle zugewiesen"); refetchEmpRoles(); },
    onError: (e: any) => toast.error(e.message),
  });
  const removeRole = trpc.rbac.removeRole.useMutation({
    onSuccess: () => { toast.success("Rolle entfernt"); refetchEmpRoles(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateEmployment = trpc.rbac.updateEmploymentType.useMutation({
    onSuccess: () => toast.success("Beschäftigungsart aktualisiert"),
    onError: (e: any) => toast.error(e.message),
  });

  const selectedMa = alleMa?.find((m: any) => m.id === selectedMaId);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Rollen & Berechtigungen</h1>
          <p className="text-muted-foreground text-sm">Granulares RBAC-System – Mehrfachrollen pro Mitarbeiter</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mitarbeiter-Auswahl */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Mitarbeiter wählen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingMa ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              alleMa?.map((ma: any) => (
                <button
                  key={ma.id}
                  onClick={() => setSelectedMaId(ma.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedMaId === ma.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{ma.vorname} {ma.nachname}</div>
                  <div className="text-xs opacity-70">{ma.rolle}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Rollen & Berechtigungen des gewählten MA */}
        <div className="md:col-span-2 space-y-4">
          {!selectedMaId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Bitte links einen Mitarbeiter auswählen.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Aktuelle Rollen */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Rollen von {selectedMa?.vorname} {selectedMa?.nachname}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 min-h-8">
                    {empRoles?.length === 0 && (
                      <span className="text-muted-foreground text-sm">Keine Rollen zugewiesen</span>
                    )}
                    {empRoles?.map((er: any) => (
                      <div key={er.role.key} className="flex items-center gap-1">
                        <Badge className={ROLLE_FARBEN[er.role.key] ?? "bg-gray-100 text-gray-800"}>
                          {er.role.label}
                        </Badge>
                        <button
                          onClick={() => removeRole.mutate({ employeeId: selectedMaId!, roleKey: er.role.key })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Rolle entfernen"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Rolle hinzufügen */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Select value={selectedRoleKey} onValueChange={setSelectedRoleKey}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Rolle wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingRoles ? (
                          <SelectItem value="_loading" disabled>Lädt...</SelectItem>
                        ) : (
                          roles?.map((r: any) => (
                            <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!selectedRoleKey) return;
                        assignRole.mutate({ employeeId: selectedMaId!, roleKey: selectedRoleKey });
                        setSelectedRoleKey("");
                      }}
                      disabled={!selectedRoleKey || assignRole.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Zuweisen
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Beschäftigungsart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Beschäftigungsart</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Select
                    value={selectedEmploymentType || selectedMa?.beschaeftigungsart || ""}
                    onValueChange={setSelectedEmploymentType}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Nicht zugewiesen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minijob">Minijob</SelectItem>
                      <SelectItem value="teilzeit">Teilzeit</SelectItem>
                      <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => updateEmployment.mutate({
                      employeeId: selectedMaId!,
                      employmentType: (selectedEmploymentType || null) as any,
                    })}
                    disabled={updateEmployment.isPending}
                  >
                    Speichern
                  </Button>
                </CardContent>
              </Card>

              {/* Effektive Berechtigungen */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Effektive Berechtigungen</CardTitle>
                </CardHeader>
                <CardContent>
                  {!empPerms || empPerms.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Keine Berechtigungen (keine Rollen zugewiesen)</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {empPerms.map((p: any) => (
                        <Badge key={p.key} variant="outline" className="text-xs font-mono">
                          {p.key}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Rollen-Übersicht */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rollen-Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles?.map((r: any) => (
              <div key={r.key} className={`rounded-lg p-3 ${ROLLE_FARBEN[r.key] ?? "bg-gray-100"}`}>
                <div className="font-semibold text-sm">{r.label}</div>
                <div className="text-xs opacity-70 font-mono">{r.key}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
