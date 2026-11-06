# Triển khai website Chiến Thắng lên Google Apps Script

## Bản triển khai một tệp

`TrienKhai.gs` gộp mã máy chủ và giao diện hiện tại, bao gồm logo. Chỉ cần dán một tệp vào dự án Google Apps Script mới; không cần tạo tệp HTML hoặc cài Node.js. Đây là bản chụp mã nguồn tại lúc chuẩn bị triển khai; nếu sửa Index.html hoặc Code.gs sau này, phải tạo lại bản gộp hoặc dùng cách triển khai ba tệp trong README.md.

1. Mở https://script.google.com/home/start bằng tài khoản Google sở hữu dữ liệu của trung tâm. Đặt tên dự án **Đặt lịch xe Chiến Thắng - Tiền Giang**.
2. Mở `TrienKhai.gs` trong VS Code, nhấn Ctrl+A rồi Ctrl+C. Trong Code.gs của dự án Google, xóa mã mẫu, dán mã vừa sao chép và lưu. Không dán thêm Code.gs hoặc Index.html từ máy vào cùng dự án này.
3. Chọn hàm **setup** trên thanh công cụ, nhấn **Run / Chạy**. Cấp quyền Google Drive và Google Sheets. Hàm tạo Sheet `Lịch đăng ký tập xe Chiến Thắng`, chuyển đăng ký cũ từ JSON sang Sheet một lần, rồi tiếp tục lưu lịch mới vào Sheet.
4. Mở **Project Settings / Cài đặt dự án → Script properties / Thuộc tính tập lệnh**. Giữ nguyên DATA_FILE_ID và BOOKING_SHEET_ID. Đặt ADMIN_PASSWORD riêng và lưu lại. Không gửi mật khẩu hoặc mã đăng nhập Google qua chat.
5. Nhấn **Deploy / Triển khai → New deployment / Triển khai mới**. Chọn biểu tượng bánh răng → **Web app / Ứng dụng web**.
6. Chọn **Execute as / Thực thi dưới dạng: Me / Tôi** và **Who has access / Ai có quyền truy cập: Anyone / Bất kỳ ai**. Nhấn **Deploy / Triển khai**, hoàn tất cấp quyền nếu được yêu cầu.
7. Sao chép **Web app URL** có đuôi `/exec`. Đây là đường dẫn dùng chung cho học viên và quản trị. Đường dẫn `/dev` chỉ dành cho thử nghiệm của người có quyền chỉnh sửa.

## Kiểm tra trước khi gửi cho học viên

- Mở đường dẫn `/exec` trong cửa sổ ẩn danh: trang không được yêu cầu học viên đăng nhập Google và không hiện thông báo BẢN XEM THỬ.
- Chọn một ngày tương lai, một xe và một giờ; nhập tên thử và đặt lịch. Mở lại bằng điện thoại hoặc cửa sổ ẩn danh khác: xe/giờ đó phải hiện đã đặt.
- Đăng nhập Quản trị bằng mật khẩu trong Script properties, kiểm tra thông tin đăng ký. Hủy lịch thử để trả lại chỗ trống.
- Trong Google Drive của chủ dự án, kiểm tra Sheet đăng ký có các cột Ngày tập, Giờ tập, Học viên, Thầy, Hạng xe, Biển số xe. Sheet và tệp JSON xe/giờ đều được giữ riêng tư.
- Thử hai cửa sổ đặt cùng xe/giờ: chỉ một yêu cầu được chấp nhận.

## Cập nhật sau này

Thay mã trong dự án, lưu, rồi chọn **Deploy → Manage deployments → Edit → Version: New version → Deploy** để giữ nguyên liên kết học viên đang sử dụng. Không xóa DATA_FILE_ID hoặc tạo tệp dữ liệu mới khi chỉ cập nhật giao diện.

Tài liệu chính thức: https://developers.google.com/apps-script/guides/web

Trạng thái hiện tại: https://script.google.com/macros/s/AKfycbzsF1WT8KGUiBPJlQJ_fArOoY0XBnwpyPNKWJAhetHE_NdEq8R22ZGugxSDceL8jG00/exec
