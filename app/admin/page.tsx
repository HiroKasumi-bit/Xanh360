import Link from 'next/link';
import {getChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import {config} from '@/lib/repository';
import AdminApp from './admin-app';
export const dynamic='force-dynamic';
export default async function AdminPage(){const user=await getChatGPTUser();if(!user)return <main className="shell"><section className="intro"><h1>Quản trị Xanh360</h1><p>Đăng nhập bằng tài khoản được cấp quyền để cập nhật dữ liệu.</p><a className="primary" href={chatGPTSignInPath('/admin')} target="_top">Đăng nhập bằng ChatGPT</a><p><Link className="text-button" href="/">Về trang tra cứu</Link></p></section></main>;if(!config('ADMIN_EMAILS').split(',').map(x=>x.trim().toLowerCase()).includes(user.email.toLowerCase()))return <main className="shell"><section className="intro"><h1>Chưa có quyền quản trị</h1><p>Tài khoản này chưa được cấp quyền cập nhật. Người vận hành cần cấu hình danh sách quản trị viên.</p><Link className="btn-outline" href="/">Về trang tra cứu</Link></section></main>;return <AdminApp/>}
