import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabaseClient';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { fonts, fontSizes } from '../../src/theme/typography';
import AccountCard from '../../components/AccountCard';
import { useAuth } from '../../src/store/useAuth';

type Profile = { nome: string | null };

export default function ContaCoordenador() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle();
        let nome = (data?.nome as string | null) ?? null;
        if (!nome) {
          const { data: userData } = await supabase.auth.getUser();
          const metaNome = (userData.user?.user_metadata?.nome as string | undefined) ?? undefined;
          if (metaNome && metaNome.trim().length > 0) {
            nome = metaNome.trim();
            await supabase.from('profiles').upsert({ id: user.id, nome }, { onConflict: 'id' });
          }
        }
        setProfile({ nome });
      } catch {
        setProfile({ nome: null });
      }
    })();
  }, [user?.id]);

  async function handleSignOut() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg, justifyContent: 'center' }}>
      <AccountCard title="Minha Conta" name={profile?.nome ?? 'Sem nome'} email={user?.email} />
      <TouchableOpacity
        onPress={handleSignOut}
        disabled={loading}
        style={{
          backgroundColor: colors.brandPink,
          padding: spacing.lg,
          borderRadius: radii.lg,
          marginTop: spacing.lg,
          ...shadows.soft,
        }}
      >
        <Text style={{ color: colors.white, textAlign: 'center', fontFamily: fonts.bold, fontSize: fontSizes.md }}>
          Sair
        </Text>
      </TouchableOpacity>
    </View>
  );
}
