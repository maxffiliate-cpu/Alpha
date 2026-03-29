import RecuperadorView from '@/features/recuperador/RecuperadorView';

export const metadata = {
  title: 'Recuperador de Carritos — Alpha',
  description: 'Monitoreo y recuperación automatizada de carritos abandonados.',
};

export default function RecuperadorPage() {
  return (
    <div className="min-h-screen">
      <RecuperadorView />
    </div>
  );
}
