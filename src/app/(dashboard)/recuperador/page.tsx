import RecuperadorView from '@/components/Recuperador/RecuperadorView';

export const metadata = {
  title: 'Recuperador de Carritos — Alpha',
  description: 'Monitoreo y recuperación automatizada de carritos abandonados.',
};

export default function RecuperadorPage() {
  return (
    <div className="p-8">
      <RecuperadorView />
    </div>
  );
}
