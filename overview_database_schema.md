

- reference_type và reference_id trỏ tới 7 loại chứng từ khác nhau nhưng không có FK ở
tầng DB
Hậu quả:
- Nếu một dòng sales_orders, purchase_orders... bị xoá (do lỗi code, migration, hoặc
thao tác thủ công), các dòng inventory_transactions tương ứng trở thành "mồ côi"
mà DB không hề báo lỗi - sổ cái kho vẫn còn nhưng chứng từ gốc đã mất, không
audit ngược lại được.
- Không thể JOIN trực tiếp bằng SQL chuẩn để lấy chi tiết chứng từ gốc; mọi báo cáo
nhập-xuất-tồn phải xử lý rẽ nhánh theo reference_type ở tầng ứng dụng → dễ sai sót,
khó tối ưu.
- Một bug nhỏ ở tầng service (gán sai reference_type) sẽ không bị DB chặn lại, có thể
gây sai lệch tồn kho mà rất khó phát hiện.
Chấp nhận được nếu đã ý thức rõ sự đánh đổi giữa tính linh hoạt và toàn vẹn dữ liệu, nhưng
nên bổ sung ràng buộc CHECK cho reference_type (giới hạn enum thay vì VARCHAR tự do)
để giảm rủi ro gõ sai chuỗi.
- Không có cơ chế "giữ chỗ" (reservation) cho tồn kho → rủi ro bán vượt tồn (oversell)
sales_order_status_enum có trạng thái ALLOCATED, nhưng không có bảng/cột nào lưu số
lượng đã giữ chỗ tách biệt khỏi số lượng khả dụng. stock_balances chỉ có một cột quantity
duy nhất.
Hậu quả: giữa lúc đơn A "xem" tồn kho còn hàng và lúc đơn A thực sự trừ kho, đơn B hoàn
toàn có thể đọc cùng số tồn đó và cũng được duyệt → hai đơn cùng giữ một lượng hàng thực
tế không đủ. Đây là lỗi race condition trong hệ thống kho, hậu quả trực tiếp là giao thiếu
hàng cho khách hoặc phải huỷ đơn sau khi đã xác nhận. Cái này hệ thống thiệt cũng đang bị

- purchase_orders không có supplier_id
Có bảng suppliers nhưng chỉ được purchase_returns tham chiếu, còn purchase_orders
(nhập kho đặt hàng) lại không có cột nào trỏ tới nhà cung cấp.
Hậu quả: nếu về sau NPP cần nhập hàng từ nhiều nguồn cung khác nhau (không chỉ từ kho
tổng/HO), hệ thống không biết đơn nhập đó đặt từ ai - không truy vết được, không tính được
công nợ phải trả theo từng NCC.
- Thiếu hoàn toàn nhóm bảng Hoá đơn & Công nợ (Invoice/AR)

sales_order_status_enum có tới hai trạng thái INVOICED và PAID, nhưng schema không có
bảng invoices hay payments nào - không lưu số hoá đơn, ngày xuất hoá đơn, VAT, phương
thức thanh toán, số tiền đã thu, hạn công nợ.
- Sai lệch giữa ERD và schema thực tế
ERD vẽ sales_orders }o--o{ delivery_trips (nhiều-nhiều), nhưng bảng thật
sales_orders.delivery_trip_id là FK đơn (1 đơn hàng chỉ gán được 1 chuyến xe). Đây là quan
hệ 1- nhiều (1 chuyến gom nhiều đơn), không phải nhiều-nhiều.
- Dùng ENUM cho tất cả state machine (6 enum trạng thái khác nhau)
sales_order_status_enum, po_status_enum, doc_status_enum, ppo_status_enum,
trip_status_enum, por_status_enum - mỗi luồng phê duyệt một enum riêng, cấu trúc gần
giống nhau.
Hậu quả: PostgreSQL ENUM rất khó sửa an toàn - thêm giá trị mới thì được (ALTER TYPE ...
ADD VALUE, và trước PG12 không thể chạy trong transaction), nhưng xoá/đổi tên giá trị gần
như không thể mà không rebuild bảng. Khi nghiệp vụ thay đổi luồng duyệt (rất hay xảy ra ở
giai đoạn vận hành thật), việc sửa 6 enum riêng biệt sẽ tốn kém. Không có ràng buộc nào ở
DB đảm bảo thứ tự chuyển trạng thái hợp lệ (ví dụ chặn DRAFT → COMPLETED bỏ qua bước
duyệt) - toàn bộ phụ thuộc code ứng dụng.
- Thiếu ràng buộc nhất quán vai trò ↔ NPP
users.distributor_id cho phép NULL "nếu là nhân sự HO", nhưng không có CHECK
constraint nào đảm bảo role NVBH/CS/Admin bắt buộc phải có (hoặc không có)
distributor_id tương ứng. Hậu quả: dữ liệu rác dễ phát sinh (VD: NVBH nhưng không gắn
NPP nào) mà DB không chặn được, phải kiểm tra hoàn toàn ở app.
- Multi-tenant nhưng không có Row-Level Security
Toàn bộ hệ thống phân vùng theo distributor_id (mỗi NPP là 1 tenant), nhưng việc lọc dữ
liệu hoàn toàn phụ thuộc câu WHERE trong code ứng dụng.
Hậu quả: chỉ cần 1 endpoint quên thêm điều kiện WHERE distributor_id = ? là NPP A có thể
nhìn thấy dữ liệu đơn hàng/tồn kho của NPP B - rủi ro rò rỉ dữ liệu giữa các NPP (đối thủ
cạnh tranh nhau trên cùng hệ thống). Với PostgreSQL, nên cân nhắc bật Row-Level Security
(RLS) làm lớp phòng thủ thứ hai ở tầng DB, không chỉ dựa vào app.
- Các thiếu sót nhỏ hơn

- Không có bảng khuyến mãi/chiết khấu: sales_order_items.is_promotion chỉ là cờ
đánh dấu, không có quy tắc khuyến mãi (thời gian áp dụng, % chiết khấu, điều kiện)
được model hoá.
- Không có chính sách ON DELETE rõ ràng cho các bảng master data (distributors,
products, warehouses) - chỉ thấy ON DELETE CASCADE ở các bảng chi tiết (items),
còn bảng cha thì không nói rõ RESTRICT/CASCADE, dễ vô tình xoá lan dữ liệu lịch sử
quan trọng.
- stock_lots UNIQUE(product_id, warehouse_id, lot_number, status): đưa status
vào khoá duy nhất nghĩa là khi một lô đổi trạng thái (GOOD → DEFECTIVE) sẽ sinh ra
dòng lô mới thay vì update - cần đảm bảo tầng ứng dụng xử lý đúng để không bị tính
trùng số lượng giữa 2 dòng lô cùng lot_number.
- Không có trường tọa độ (lat/long) cho retailers/warehouses - hạn chế nếu sau này
muốn tối ưu tuyến giao hàng cho delivery_trips.
- ERD chỉ thể hiện 10/27 bảng ("core").



