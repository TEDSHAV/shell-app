import { getAllUsers, getAllDepartments, canAccessUserManagement } from "@/actions/directory";
import { DirectoryClient } from "./DirectoryClient";

export const metadata = {
  title: "Directorio | PRISMA",
};

export default async function DirectorioPage() {
  const [users, departments, canManage] = await Promise.all([
    getAllUsers(),
    getAllDepartments(),
    canAccessUserManagement(),
  ]);
  return <DirectoryClient users={users} departments={departments} canManage={canManage} />;
}
