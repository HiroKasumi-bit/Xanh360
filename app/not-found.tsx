import Link from 'next/link';
import {Search} from 'lucide-react';

// A missing address gets the app's own page (paper, type, Vietnamese) instead of the framework's English default.
export default function NotFound(){
 return <main className="shell not-found"><section className="intro"><span className="eyebrow">Lỗi 404</span><h1>Không tìm thấy trang này</h1><p>Đường dẫn có thể đã thay đổi hoặc chưa từng có trên Xanh360.</p><Link className="primary" href="/"><Search aria-hidden="true"/>Về trang tra cứu</Link></section></main>;
}
