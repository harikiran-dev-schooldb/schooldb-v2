import type { OperationsModule } from "./data";
import { HealthManager } from "./HealthManager";
import { InventoryManager } from "./InventoryManager";
import { MaintenanceManager } from "./MaintenanceManager";
import { ManagementAnalytics } from "./ManagementAnalytics";
import { PickupManager } from "./PickupManager";
import type { OperationsData } from "./shared";
import { StaffOperationsManager } from "./StaffOperationsManager";
import { VisitorManager } from "./VisitorManager";

export function OperationsManager({ module, data }: { module: OperationsModule; data: OperationsData }) {
  if (module === "staff") return <StaffOperationsManager data={data} />;
  if (module === "visitors") return <VisitorManager data={data} />;
  if (module === "health") return <HealthManager data={data} />;
  if (module === "inventory") return <InventoryManager data={data} />;
  if (module === "pickup") return <PickupManager data={data} />;
  if (module === "maintenance") return <MaintenanceManager data={data} />;
  return <ManagementAnalytics data={data} />;
}
