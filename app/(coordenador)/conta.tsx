import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabaseClient';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { fonts, fontSizes } from '../../src/theme/typography';
import AccountCard from '../../components/AccountCard';
import { useAuth } from '../../src/store/useAuth';

type Profile = { nome: string | null; avatarUrl: string | null };

export default function ContaCoordenador() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('nome,avatar_url')
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
        setProfile({ nome, avatarUrl: (data?.avatar_url as string | null) ?? null });
      } catch {
        setProfile({ nome: null, avatarUrl: null });
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

  async function pickAvatar() {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para atualizar o avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    try {
      setUploading(true);
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = asset.fileName?.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });
      if (uploadErr) throw uploadErr;
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = publicUrl?.publicUrl ?? null;
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (updateErr) throw updateErr;
      setProfile((prev) => ({ ...(prev ?? { nome: null, avatarUrl: null }), avatarUrl: url }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível atualizar a foto de perfil.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <AccountCard
          title="Minha Conta"
          name={profile?.nome ?? 'Sem nome'}
          email={user?.email}
          avatarUrl={profile?.avatarUrl}
        />
        <TouchableOpacity
          onPress={pickAvatar}
          disabled={uploading}
          style={{
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.brandCyan,
            alignSelf: 'center',
            backgroundColor: colors.white,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.brandCyan, fontFamily: fonts.bold }}>
            {uploading ? 'Enviando...' : 'Atualizar foto'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={loading}
          style={{
            backgroundColor: colors.brandPink,
            padding: spacing.lg,
            borderRadius: radii.lg,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.white, textAlign: 'center', fontFamily: fonts.bold, fontSize: fontSizes.md }}>
            {loading ? 'Saindo...' : 'Sair'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
