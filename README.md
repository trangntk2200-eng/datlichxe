# Website đặt lịch tập xe

Hai màn hình tiếng Việt, dùng Google Apps Script; lịch đăng ký được lưu vào Google Sheets, còn xe và khung giờ được lưu trong tệp JSON riêng trên Google Drive của chủ ứng dụng.

## Chạy chính thức trên Google Drive

1. Truy cập https://script.google.com và tạo **New project** bằng tài khoản Google quản lý dữ liệu.
2. Chép nội dung `Code.gs` vào tệp Code.gs trong dự án.
3. Tạo tệp HTML tên **Index**, chép nội dung `Index.html` vào.
4. Trong Project Settings, bật hiển thị manifest `appsscript.json`, thay bằng nội dung tệp cùng tên trong thư mục này.
5. Chạy hàm **setup** một lần và cấp quyền Drive, Sheets. Hàm tạo tệp `dat-lich-xe.json` cho xe/giờ và Google Sheet `Lịch đăng ký tập xe Chiến Thắng` cho lịch đăng ký. Xe mặc định gồm 5 xe B.01, 7 xe B, 7 xe C1; giờ 06:00–07:00 và 07:00–08:00. Khi có dữ liệu JSON cũ, setup chuyển các lịch hiện có sang Sheet một lần.
6. Trong Project Settings → Script properties, giữ `DATA_FILE_ID` và `BOOKING_SHEET_ID`; đặt `ADMIN_PASSWORD` thành mật khẩu mạnh. Không chia sẻ mật khẩu cho học viên.
7. Deploy → New deployment → Web app. Chọn **Execute as: Me**, **Who has access: Anyone** để học viên không phải đăng nhập. Bấm Deploy và gửi đường dẫn `/exec` cho học viên. Tùy chính sách Workspace, quản trị Google có thể không cho phép truy cập ẩn danh.
8. Mở cùng đường dẫn, chọn **Quản trị**, nhập mật khẩu đã cấu hình.

Khi cập nhật mã: Deploy → Manage deployments → Edit → New version → Deploy.

## Xem giao diện trên máy

Mở `Index.html` trong trình duyệt. Đây là chế độ xem thử dùng localStorage, mật khẩu **12345678**; dữ liệu không đồng bộ giữa các máy và không đưa lên Drive. Không dùng chế độ này để tiếp nhận đăng ký thật. Nếu trình duyệt hạn chế localStorage cho tệp mở trực tiếp, cần mở qua một máy chủ HTTP tĩnh.

## Chức năng

- Học viên chọn ngày, hạng, một xe và tối đa hai khung giờ; nhập tên học viên và giáo viên. Lịch công khai chỉ hiển thị chỗ trống/đã đặt, không trả tên học viên hay giáo viên.
- Kiểm tra ngày, giờ đã qua và xe còn tồn tại ở máy chủ. Khóa toàn bộ thao tác đọc/ghi bằng LockService để hai người không thể đặt cùng xe, ngày, giờ; hai khung giờ được lưu trong một lần ghi.
- Quản trị xem và lọc toàn bộ lịch, xuất CSV, hủy lượt đặt, thêm/sửa/xóa xe và khung giờ. Khung giờ không được chồng lấn. Mỗi khung giờ được tính là một lượt đặt.
- Chặn xóa xe/khung giờ có lịch từ hôm nay trở đi; chặn sửa khung giờ đang có lịch. Tên xe, hạng và thời gian trong lịch cũ được giữ như lúc đăng ký để bảo toàn lịch sử.
- Tự làm mới mỗi 30 giây. Mật khẩu quản trị chỉ giữ trong bộ nhớ của tab, được kiểm tra ở máy chủ mỗi yêu cầu quản trị.
- Sheet lưu các trường `Ngày tập`, `Giờ tập`, `Học viên`, `Thầy`, `Hạng xe`, `Biển số xe`; các mã nội bộ được ẩn. Tệp Drive chỉ giữ xe và khung giờ. Giữ cả Sheet và tệp JSON riêng tư; không cần bật chia sẻ công khai.

## Giới hạn triển khai

Ứng dụng cần chủ tài khoản tự cấp quyền Google Drive và triển khai Apps Script theo hướng dẫn trên; mã nguồn chưa phải một website đã xuất bản. Apps Script và Drive chịu hạn mức Google, phù hợp trung tâm nhỏ; mật khẩu dùng chung không có tài khoản riêng hoặc nhật ký từng quản trị viên. Giao diện xem thử không thay thế kiểm tra hai thiết bị đồng thời sau triển khai. Phông chữ dùng Google Fonts và có phông hệ thống dự phòng.

## Bản demo trên Netlify

Netlify phục vụ bản tĩnh trong `public/`. Khi chạy ngoài Apps Script, giao diện dùng `localStorage` và mật khẩu demo `12345678`; dữ liệu chỉ có trên trình duyệt hiện tại, không đồng bộ giữa người dùng và không lưu vào Drive. Không dùng link Netlify để nhận lịch thật; dùng URL `/exec` của Apps Script ở trên.
