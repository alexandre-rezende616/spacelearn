import { Redirect } from 'expo-router';

export default function CoordenadorIndex() {
  return <Redirect href={{ pathname: "/(coordenador)/painel" } as any} />;
}
