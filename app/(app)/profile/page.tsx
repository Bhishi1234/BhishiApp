import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentProfile } from "@/lib/group-data";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentProfile();
  if (!user || !profile) {
    return (
      <div className="px-5 py-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see your profile.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Your details stay with this account. They are not used to move money.
      </p>
      <ProfileForm profile={profile} email={user.email} />
    </div>
  );
}
