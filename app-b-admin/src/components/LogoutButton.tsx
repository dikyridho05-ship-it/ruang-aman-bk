import { logoutAdminAction } from "@/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logoutAdminAction}>
      <button type="submit" className="text-sm font-medium text-red-600 underline">
        Keluar
      </button>
    </form>
  );
}
