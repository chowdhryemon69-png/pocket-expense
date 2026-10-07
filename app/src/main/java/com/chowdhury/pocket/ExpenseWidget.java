package com.chowdhury.pocket;
import android.app.*;import android.appwidget.*;import android.content.*;import android.os.*;import android.widget.*;import org.json.*;import java.time.*;import java.util.*;
public class ExpenseWidget extends AppWidgetProvider {
 /* Neutral placeholder used when home-screen privacy is on. It is not a currency value. */
 static final String MASK="••••";
 private static final int ACTION_OPEN=0,ACTION_ADD=1,ACTION_FOOD=2,ACTION_TRANSPORT=3,ACTION_GROCERIES=4;
 public static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);render(c,m,m.getAppWidgetIds(new ComponentName(c,ExpenseWidget.class)),false);render(c,m,m.getAppWidgetIds(new ComponentName(c,CompactWidget.class)),true);}
 public void onReceive(Context c,Intent i){super.onReceive(c,i);refresh(c);}
 public void onUpdate(Context c,AppWidgetManager m,int[] ids){render(c,m,ids,false);}
 public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle o){render(c,m,new int[]{id},m.getAppWidgetInfo(id)!=null&&CompactWidget.class.getName().equals(m.getAppWidgetInfo(id).provider.getClassName()));}
 /* Snapshot of the stored records: totals, rollover day counts and the privacy/language flags. */
 static class Snapshot{boolean bn,hide;long today,total,left,reserve;String remembered;double ratio;boolean over,ahead;int days,remainingDays;boolean ready(){return days>0;}}
 static Snapshot snapshot(Context c){Snapshot s=new Snapshot();LocalDate now=LocalDate.now();String date=now.toString(),month=date.substring(0,7);s.days=now.lengthOfMonth();try{JSONObject d=new JSONObject(c.getSharedPreferences("pocket",0).getString("data","{}"));JSONObject monthly=d.optJSONObject("monthly"),cfg=monthly==null?null:monthly.optJSONObject(month);if(cfg==null)cfg=d;s.bn="bn".equals(d.optString("language"));s.hide=d.optBoolean("allowHideAmounts",false);s.remembered=d.optString("lastCategory","");long budget=cfg.optLong("budget");s.reserve=cfg.optLong("reserve");JSONArray a=d.optJSONArray("entries");if(a!=null)for(int j=0;j<a.length();j++){JSONObject e=a.getJSONObject(j);String day=e.optString("date");long amount=e.optLong("amount");if(day.equals(date))s.today+=amount;if(day.startsWith(month))s.total+=amount;}long limit=Math.max(0,budget-s.reserve);s.left=limit-s.total;s.ratio=limit>0?s.total/(double)limit:0;s.over=budget>0&&s.total>limit;s.ahead=budget>0&&!s.over&&s.ratio>now.getDayOfMonth()/(double)s.days;s.remainingDays=s.days-now.getDayOfMonth()+1;}catch(Exception e){}return s;}
 static void render(Context c,AppWidgetManager m,int[] ids,boolean compact){if(ids==null||ids.length==0)return;Snapshot s=snapshot(c);int color=s.over?0xffF2B6A7:s.ahead?0xffF5D28A:0xffD9F08B;boolean hasBudget=s.ready();long left=s.left;long perDay=Math.max(0,left)/(s.remainingDays>0?s.remainingDays:1);
 for(int id:ids){int spanY=0;try{Bundle o=m.getAppWidgetOptions(id);spanY=o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)>0?o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT):o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);}catch(Exception e){}
 /* Compact sources stay compact even if the host cannot report its own provider class. */
 boolean small=compact||spanY>0&&spanY<180;
 RemoteViews v=new RemoteViews(c.getPackageName(),small?R.layout.widget_compact:R.layout.widget);
 v.setTextViewText(R.id.label,s.bn?"আজকের খরচ":"TODAY’S SPENDING");
 v.setTextViewText(R.id.today,s.hide?MASK:money(s.today,s.bn));
 int remainingColor=color;
 if(!hasBudget){v.setTextViewText(R.id.remaining,s.bn?"বাজেট নির্ধারণ করুন":"Tap to set your budget");v.setTextViewText(R.id.check,s.bn?"বাজেট নির্ধারণ করুন":"Set budget");remainingColor=0xffD9F08B;}
 else if(left>=0){String amount=s.hide?MASK:money(left,s.bn);v.setTextViewText(R.id.remaining,(s.bn?"এই মাসে অবশিষ্ট · ":"Remaining this month · ")+amount);v.setTextViewText(R.id.check,(s.bn?"এই মাসে অবশিষ্ট · ":"Remaining this month · ")+amount);}
 else{String overText=(s.bn?"বাজেটের বেশি · ":"Over budget · ")+(s.hide?MASK:money(-left,s.bn));v.setTextViewText(R.id.remaining,overText);v.setTextViewText(R.id.check,overText);}
 v.setTextColor(R.id.remaining,remainingColor);v.setTextColor(R.id.check,remainingColor);
 if(small){v.setTextViewText(R.id.addAvailable,hasBudget?(s.bn?"আজ · ":"Today · ")+(s.hide?MASK:money(perDay,s.bn)):(s.bn?"বাজেট নেই":"No budget"));}
 else{v.setTextViewText(R.id.month,(s.bn?"এই মাস · ":"This month · ")+(s.hide?MASK:money(s.total,s.bn)));v.setProgressBar(R.id.progress,100,(int)Math.min(100,Math.max(0,Math.round(s.ratio*100))),false);v.setTextViewText(R.id.allowance,hasBudget?(s.bn?"আজ ব্যবহারযোগ্য · ":"Available today · ")+(s.hide?MASK:money(perDay,s.bn)):(s.bn?"খরচ যোগ করতে + চাপুন":"Tap + to add an expense"));v.setTextViewText(R.id.pace,s.over?(s.bn?"বাজেটের বেশি":"Over spending budget"):s.ahead?(s.bn?"মাসের তুলনায় খরচ এগিয়ে":"Spending ahead of month progress"):hasBudget?(s.bn?"মাসের অগ্রগতির মধ্যে":"Within month progress"):(s.bn?"অফলাইন · BDT":"Offline · BDT"));v.setTextColor(R.id.pace,color);}
 /* Expense shortcuts stay usable when amounts are hidden. */
 int[] shortcutIds=small?new int[]{R.id.add}:new int[]{R.id.add,R.id.addFood,R.id.addTransport,R.id.addGroceries};
 for(int shortcut:shortcutIds){String category=categoryFor(shortcut,c,s);v.setOnClickPendingIntent(shortcut,addIntent(c,category,ACTION_ADD+(category==null?0:categoryIndex(category))));}
 v.setOnClickPendingIntent(R.id.card,activity(c,ACTION_OPEN,null));
 v.setOnClickPendingIntent(R.id.check,activity(c,ACTION_OPEN,null));
 m.updateAppWidget(id,v);}}
 static String categoryFor(int viewId,Context c,Snapshot s){if(viewId==R.id.add)return null;if(viewId==R.id.addFood)return "Food";if(viewId==R.id.addTransport)return "Transport";if(viewId==R.id.addGroceries)return "Groceries";return "";}
 static int categoryIndex(String category){return "Food".equals(category)?0:"Transport".equals(category)?1:"Groceries".equals(category)?2:0;}
 private static PendingIntent addIntent(Context c,String category,int counter){Intent i=new Intent(c,MainActivity.class).putExtra("add",true);if(category!=null)i.putExtra("category",category);return PendingIntent.getActivity(c,ACTION_ADD+(category==null?0:categoryIndex(category)),i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);}
 private static PendingIntent activity(Context c,int action,String category){Intent i=new Intent(c,MainActivity.class);if(category!=null)i.putExtra("category",category);return PendingIntent.getActivity(c,action,i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);}
 static String money(long paisa,boolean bn){return "৳ "+String.format(bn?new Locale("bn","BD"):Locale.US,"%,.2f",paisa/100.0);}
}
