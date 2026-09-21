import { useLocalSearchParams } from 'expo-router';
import { ClientScreen } from '@/features/client/ClientScreen';
import { CLIENTS, type ClientId } from '@/features/client/blockers';

export default function ClientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const key = (id && id in CLIENTS ? id : 'instagram') as ClientId;
  return <ClientScreen id={key} />;
}
