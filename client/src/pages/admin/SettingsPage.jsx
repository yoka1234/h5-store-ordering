import { useEffect, useState, useRef } from 'react';
import { Button, Toast, NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { adminGetTimeSlots, adminUpdateTimeSlot, adminGetSettings, adminSaveSettings, adminUploadQrcode, adminChangePassword } from '../../api/client';

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentQrcode, setPaymentQrcode] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const qrcodeRef = useRef(null);

  useEffect(() => {
    adminGetTimeSlots().then(setSlots);
    adminGetSettings().then((s) => {
      setPaymentMethod(s.payment_method || '支付宝/微信');
      setPaymentQrcode(s.payment_qrcode || '');
    });
  }, []);

  const handleQrcodeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('qrcode', file);
      const res = await adminUploadQrcode(formData);
      setPaymentQrcode(res.url);
      Toast.show({ icon: 'success', content: '收款码已上传' });
    } catch {
      Toast.show({ icon: 'fail', content: '上传失败' });
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const slot of slots) {
        await adminUpdateTimeSlot(slot.id, {
          slot_name: slot.slot_name,
          cutoff_hour: Number(slot.cutoff_hour),
          cutoff_minute: Number(slot.cutoff_minute),
        });
      }
      await adminSaveSettings({ payment_method: paymentMethod, payment_qrcode: paymentQrcode });
      Toast.show({ icon: 'success', content: '保存成功' });
    } catch {
      Toast.show({ icon: 'fail', content: '保存失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ icon: 'fail', content: '请填写完整信息' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ icon: 'fail', content: '两次输入的密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ icon: 'fail', content: '新密码长度至少6位' });
      return;
    }
    setChangingPassword(true);
    try {
      await adminChangePassword(oldPassword, newPassword);
      Toast.show({ icon: 'success', content: '密码修改成功' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.response?.data?.message || '修改失败' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5' }}>
      <NavBar onBack={() => navigate(-1)}>系统设置</NavBar>

      <div style={{ padding: 16 }}>
        {/* Time Slot Settings */}
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>配送时段</div>
        {slots.map((slot, idx) => (
          <div
            key={slot.id}
            style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{slot.slot_name}配送</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>截单时间</span>
              <input
                type="number" min={0} max={23}
                value={slots[idx].cutoff_hour}
                onChange={(e) => {
                  const newSlots = [...slots];
                  newSlots[idx].cutoff_hour = e.target.value;
                  setSlots(newSlots);
                }}
                style={{ width: 60, height: 36, border: '1px solid #ebedf0', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
              />
              <span>:</span>
              <input
                type="number" min={0} max={59}
                value={slots[idx].cutoff_minute}
                onChange={(e) => {
                  const newSlots = [...slots];
                  newSlots[idx].cutoff_minute = e.target.value;
                  setSlots(newSlots);
                }}
                style={{ width: 60, height: 36, border: '1px solid #ebedf0', borderRadius: 8, textAlign: 'center', fontSize: 14 }}
              />
            </div>
          </div>
        ))}

        {/* Payment Settings */}
        <div style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 10px' }}>收款设置</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>收款方式说明</div>
          <input
            placeholder="如：请扫以下二维码付款（支持支付宝/微信）"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 12px', fontSize: 14, marginBottom: 14 }}
          />
          <div style={{ fontSize: 14, marginBottom: 6 }}>收款二维码图片</div>
          <input
            ref={qrcodeRef}
            type="file"
            accept="image/*"
            onChange={handleQrcodeUpload}
            style={{ display: 'none' }}
          />
          <Button size="small" loading={uploadingQr} onClick={() => qrcodeRef.current?.click()}>
            上传收款码
          </Button>
          {paymentQrcode && (
            <div style={{ marginTop: 10 }}>
              <img src={paymentQrcode} alt="收款码" style={{ width: 160, height: 160, objectFit: 'contain', border: '1px solid #ebedf0', borderRadius: 8 }} />
            </div>
          )}
        </div>

        <Button block color="primary" size="large" loading={loading} onClick={handleSave}>
          保存设置
        </Button>

        {/* 修改密码 */}
        <div style={{ fontSize: 16, fontWeight: 700, margin: '20px 0 10px' }}>修改密码</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>原密码</div>
          <input
            type="password"
            placeholder="请输入原密码"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 12px', fontSize: 14, marginBottom: 12 }}
          />
          <div style={{ fontSize: 14, marginBottom: 6 }}>新密码</div>
          <input
            type="password"
            placeholder="请输入新密码（至少6位）"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 12px', fontSize: 14, marginBottom: 12 }}
          />
          <div style={{ fontSize: 14, marginBottom: 6 }}>确认新密码</div>
          <input
            type="password"
            placeholder="请再次输入新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 12px', fontSize: 14, marginBottom: 14 }}
          />
          <Button block color="primary" size="small" loading={changingPassword} onClick={handleChangePassword}>
            修改密码
          </Button>
        </div>

        <div style={{ marginTop: 20, padding: 12, background: '#fffbe6', borderRadius: 8, fontSize: 13, color: '#ad8b00' }}>
          提示：当天超过截单时间后，顾客将无法选择该时段下单。收款二维码可在商品送达后供顾客扫码付款。
        </div>
      </div>
    </div>
  );
}
