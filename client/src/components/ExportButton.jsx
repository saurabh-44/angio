import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

// Small wrapper for the dozen places that link to an /api/excel/export
// endpoint. Renders an outline button with a download icon. `href` is
// always same-origin (Vite proxy → backend) so cookies travel.
export default function ExportButton({
  href,
  label = 'Export',
  variant = 'outline',
  size = 'sm',
  className,
}) {
  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a href={href} target="_blank" rel="noopener noreferrer" download>
        <Download className="h-4 w-4" /> {label}
      </a>
    </Button>
  );
}
