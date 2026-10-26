import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ADMIN_ROLE } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { getAdminUsers } from "@/features/users/queries/get-admin-users";
import { InviteForm } from "@/features/users/components/invite-form";
import { TeamList } from "@/features/users/components/team-list";
import { SettingsScreen } from "@/features/users/components/settings-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Settings | AKT Gifting Admin" };

export default async function SettingsPage() {
  if (MOCK_MODE) return <SettingsScreen />;

  const session = await requireAdmin();
  const isSuperAdmin = session.role === ADMIN_ROLE.SUPER_ADMIN;

  const users = await getAdminUsers();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Who can sign in to this admin, and what they can reach."
      />

      <div className="flex flex-col gap-6 px-6 py-6 sm:px-8">
        {isSuperAdmin ? (
          <Card
            title="Invite a team member"
            subtitle="They set their own password from the link you send."
          >
            <InviteForm />
          </Card>
        ) : null}

        <Card
          title="Team"
          subtitle={`${users.length} ${users.length === 1 ? "account" : "accounts"}`}
          className="pb-1"
        >
          <div className="mt-4">
            <TeamList users={users} />
          </div>
        </Card>
      </div>
    </>
  );
}
