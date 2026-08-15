import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentProfile } from "@/lib/group-data";
import { isProfileComplete } from "@/lib/profile";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see your profile.</p>
      </div>
    );
  }

  const needsSetup = setup === "1" || !isProfileComplete(profile);

  return (
    <div className="px-5 py-6">
      <PageHeader
        kicker="खाते"
        title={needsSetup ? "Complete your profile" : "Your profile"}
        subtitle={
          needsSetup
            ? "Name and mobile number are required before you can create or join a group."
            : "Shown on invites and WhatsApp reminders. The app never uses this to send money."
        }
      />
      <ProfileForm profile={profile} email={user.email} setup={needsSetup} />
    </div>
  );
}
